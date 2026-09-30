package utils

import "testing"

func TestRoleCapabilities(t *testing.T) {
	tests := []struct {
		role       string
		capability Capability
		allowed    bool
	}{
		{"owner", CapabilityDeleteWorkspace, true},
		{"admin", CapabilityManageWorkspace, true},
		{"admin", CapabilityDeleteWorkspace, false},
		{"member", CapabilityWrite, true},
		{"member", CapabilityApprove, false},
		{"viewer", CapabilityRead, true},
		{"viewer", CapabilityWrite, false},
		{"unknown", CapabilityRead, false},
	}
	for _, test := range tests {
		if got := RoleAllows(test.role, test.capability); got != test.allowed {
			t.Fatalf("RoleAllows(%q, %q) = %v, want %v", test.role, test.capability, got, test.allowed)
		}
	}
}
