package drift

import (
	"context"
	"errors"
	"testing"

	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/modules/provider"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type fixtureResolver struct {
	want   primitive.ObjectID
	config provider.Connection
	err    error
}

func (f fixtureResolver) Resolve(_ context.Context, workspace primitive.ObjectID) (provider.Connection, error) {
	if workspace != f.want {
		return provider.Connection{}, errors.New("wrong workspace selected")
	}
	return f.config, f.err
}

func TestProviderSelectionHasNoFallback(t *testing.T) {
	workspace := primitive.NewObjectID()
	local := NewInferenceClient(config.Config{DriftInferenceEnabled: false})
	for _, tc := range []struct {
		name       string
		connection provider.Connection
		resolveErr error
		wantName   string
		wantErr    bool
	}{
		{"local selected", provider.Connection{ProviderType: provider.TypeLocal}, nil, "local", false},
		{"external selected", provider.Connection{ProviderType: provider.TypeExternal, Endpoint: "https://api.example.com/v1", Model: "mock-model", APIKey: "synthetic-token"}, nil, provider.TypeExternal, false},
		{"external invalid endpoint", provider.Connection{ProviderType: provider.TypeExternal, Endpoint: "http://127.0.0.1", Model: "mock-model", APIKey: "synthetic-token"}, nil, "", true},
		{"credential failure", provider.Connection{}, provider.ErrCredentialInvalid, "", true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			service := NewServiceWithProviders(nil, local, fixtureResolver{want: workspace, config: tc.connection, err: tc.resolveErr})
			selected, err := service.forWorkspace(context.Background(), workspace)
			if tc.wantErr {
				if err == nil || selected != nil {
					t.Fatal("failed external selection fell back to local")
				}
				return
			}
			if err != nil || selected.ProviderName() != tc.wantName {
				t.Fatalf("wrong provider selected: %v %v", selected, err)
			}
		})
	}
}
