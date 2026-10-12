package provider

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/netip"
	"testing"
)

func TestEndpointPolicy(t *testing.T) {
	for _, raw := range []string{
		"http://api.example.com/v1", "file:///tmp/key", "ftp://api.example.com",
		"https://127.0.0.1/v1", "https://169.254.169.254/v1", "https://localhost/v1",
		"https://api.example.com:8443/v1", "https://user:pass@api.example.com/v1",
		"https://api.example.com/v1?target=private", "https://api.example.com/v1#secret",
		"https://api.example.com/%2e%2e", "https://api.example.com//v1",
	} {
		if _, err := ValidateEndpoint(raw); !errors.Is(err, ErrEndpointRejected) {
			t.Errorf("unsafe endpoint accepted: %s", raw)
		}
	}
	if canonical, err := ValidateEndpoint("https://api.example.com/v1/"); err != nil || canonical != "https://api.example.com/v1" {
		t.Fatalf("valid endpoint rejected: %q %v", canonical, err)
	}
}

func TestPublicAddressPolicy(t *testing.T) {
	for _, raw := range []string{
		"127.0.0.1", "10.0.0.1", "172.16.2.3", "192.168.1.1", "169.254.169.254", "100.64.0.1",
		"::", "::1", "fc00::1", "fe80::1", "ff02::1", "64:ff9b::a00:1", "::ffff:127.0.0.1", "::ffff:10.0.0.1",
		"2001::1", "2001:2::1", "2001:20::1", "2001:db8::1", "2002:c000:0201::1",
		"2620:4f:8000::1", "3fff::1", "5f00::1",
	} {
		if publicAddress(netip.MustParseAddr(raw)) {
			t.Errorf("non-public destination accepted: %s", raw)
		}
	}
	for _, raw := range []string{"8.8.8.8", "::ffff:8.8.8.8", "2606:4700:4700::1111", "2001:4860:4860::8888"} {
		if !publicAddress(netip.MustParseAddr(raw)) {
			t.Errorf("public destination rejected: %s", raw)
		}
	}
}

func TestDialRejectsSpecialUseIPv6BeforeConnection(t *testing.T) {
	for _, raw := range []string{"2002:c000:0201::1", "3fff::1", "2620:4f:8000::1"} {
		t.Run(raw, func(t *testing.T) {
			called := false
			client := safeHTTPClient(
				func(context.Context, string) ([]net.IPAddr, error) {
					return []net.IPAddr{{IP: net.ParseIP("2606:4700:4700::1111")}, {IP: net.ParseIP(raw)}}, nil
				},
				func(context.Context, string, string) (net.Conn, error) { called = true; return nil, nil },
			)
			_, err := client.Get("https://api.example.com/v1/chat/completions")
			if err == nil || called {
				t.Fatal("special-use IPv6 DNS answer reached dialer")
			}
		})
	}
}

func TestDialRejectsReboundPrivateAddressBeforeConnection(t *testing.T) {
	called := false
	client := safeHTTPClient(
		func(context.Context, string) ([]net.IPAddr, error) {
			return []net.IPAddr{{IP: net.ParseIP("127.0.0.1")}}, nil
		},
		func(context.Context, string, string) (net.Conn, error) { called = true; return nil, nil },
	)
	_, err := client.Get("https://api.example.com/v1/chat/completions")
	if err == nil || called {
		t.Fatal("private DNS answer reached dialer")
	}
}

func TestMixedDNSAnswersAndRedirectsFailClosed(t *testing.T) {
	called := false
	client := safeHTTPClient(
		func(context.Context, string) ([]net.IPAddr, error) {
			return []net.IPAddr{{IP: net.ParseIP("8.8.8.8")}, {IP: net.ParseIP("169.254.169.254")}}, nil
		},
		func(context.Context, string, string) (net.Conn, error) { called = true; return nil, nil },
	)
	_, err := client.Get("https://api.example.com/v1/chat/completions")
	if err == nil || called {
		t.Fatal("mixed DNS answer reached dialer")
	}
	if !errors.Is(client.CheckRedirect(nil, nil), ErrEndpointRejected) {
		t.Fatal("redirects were not disabled")
	}
	transport := client.Transport.(*http.Transport)
	if transport.Proxy != nil || transport.TLSClientConfig != nil {
		t.Fatal("proxy or TLS override weakened endpoint policy")
	}
}
