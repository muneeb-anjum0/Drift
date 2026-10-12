package provider

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"strings"
	"time"
)

var ErrEndpointRejected = errors.New("provider endpoint is not allowed")

var deniedIPv4 = prefixes(
	"0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8",
	"169.254.0.0/16", "172.16.0.0/12", "192.0.0.0/24", "192.0.2.0/24",
	"192.88.99.0/24", "192.168.0.0/16", "198.18.0.0/15",
	"198.51.100.0/24", "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4",
)
var globalIPv6 = netip.MustParsePrefix("2000::/3")
var deniedIPv6 = prefixes("2001::/23", "2001:db8::/32", "2001:20::/28")

func prefixes(raw ...string) []netip.Prefix {
	out := make([]netip.Prefix, 0, len(raw))
	for _, item := range raw {
		out = append(out, netip.MustParsePrefix(item))
	}
	return out
}

func publicAddress(ip netip.Addr) bool {
	if !ip.IsValid() || !ip.IsGlobalUnicast() {
		return false
	}
	ip = ip.Unmap()
	if ip.Is4() {
		for _, prefix := range deniedIPv4 {
			if prefix.Contains(ip) {
				return false
			}
		}
		return true
	}
	if !globalIPv6.Contains(ip) {
		return false
	}
	for _, prefix := range deniedIPv6 {
		if prefix.Contains(ip) {
			return false
		}
	}
	return true
}

// ValidateEndpoint permits only public-domain HTTPS base URLs. The policy is
// re-enforced on every network connection, not only when a value is saved.
func ValidateEndpoint(raw string) (string, error) {
	if len(raw) < 10 || len(raw) > 512 || strings.TrimSpace(raw) != raw {
		return "", ErrEndpointRejected
	}
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" || u.Opaque != "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || u.RawFragment != "" {
		return "", ErrEndpointRejected
	}
	if u.Port() != "" && u.Port() != "443" {
		return "", ErrEndpointRejected
	}
	host := strings.ToLower(u.Hostname())
	if host == "" || host != u.Hostname() || len(host) > 253 || strings.HasSuffix(host, ".") || net.ParseIP(host) != nil {
		return "", ErrEndpointRejected
	}
	parts := strings.Split(host, ".")
	if len(parts) < 2 {
		return "", ErrEndpointRejected
	}
	for _, part := range parts {
		if len(part) == 0 || len(part) > 63 || part[0] == '-' || part[len(part)-1] == '-' {
			return "", ErrEndpointRejected
		}
		for _, char := range part {
			if !((char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') || char == '-') {
				return "", ErrEndpointRejected
			}
		}
	}
	if len(parts[len(parts)-1]) < 2 || host == "localhost.localdomain" {
		return "", ErrEndpointRejected
	}
	path := strings.TrimSuffix(u.EscapedPath(), "/")
	if len(path) > 128 || strings.Contains(path, "%") || strings.Contains(path, "//") || strings.Contains(path, "..") {
		return "", ErrEndpointRejected
	}
	for _, char := range path {
		if !((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9') || char == '/' || char == '_' || char == '-') {
			return "", ErrEndpointRejected
		}
	}
	return "https://" + host + path, nil
}

type lookupIPs func(context.Context, string) ([]net.IPAddr, error)
type dialAddress func(context.Context, string, string) (net.Conn, error)

func safeHTTPClient(lookup lookupIPs, dial dialAddress) *http.Client {
	transport := &http.Transport{
		Proxy:                 nil,
		TLSHandshakeTimeout:   5 * time.Second,
		ResponseHeaderTimeout: 15 * time.Second,
		DisableKeepAlives:     true,
		DialContext: func(ctx context.Context, network, address string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(address)
			if err != nil || port != "443" {
				return nil, ErrEndpointRejected
			}
			resolved, err := lookup(ctx, host)
			if err != nil || len(resolved) == 0 {
				return nil, ErrEndpointRejected
			}
			for _, candidate := range resolved {
				parsed, ok := netip.AddrFromSlice(candidate.IP)
				if !ok || !publicAddress(parsed) {
					return nil, ErrEndpointRejected
				}
			}
			return dial(ctx, network, net.JoinHostPort(resolved[0].IP.String(), port))
		},
	}
	return &http.Client{
		Timeout:       20 * time.Second,
		Transport:     transport,
		CheckRedirect: func(*http.Request, []*http.Request) error { return ErrEndpointRejected },
	}
}

func SafeHTTPClient() *http.Client {
	resolver := net.DefaultResolver
	dialer := &net.Dialer{Timeout: 5 * time.Second}
	return safeHTTPClient(resolver.LookupIPAddr, dialer.DialContext)
}
