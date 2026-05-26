package project

type CreateProjectRequest struct {
	WorkspaceID   string `json:"workspaceId" validate:"required"`
	Name          string `json:"name" validate:"required"`
	ClientName    string `json:"clientName"`
	Description   string `json:"description"`
	Status        string `json:"status"`
	Priority      string `json:"priority"`
	OriginalScope string `json:"originalScope"`
	Deadline      string `json:"deadline"`
}

type UpdateProjectRequest struct {
	Name          string `json:"name"`
	ClientName    string `json:"clientName"`
	Description   string `json:"description"`
	Status        string `json:"status"`
	Priority      string `json:"priority"`
	OriginalScope string `json:"originalScope"`
	Deadline      string `json:"deadline"`
}
