package requirement

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Requirement struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Project            primitive.ObjectID `bson:"project" json:"project"`
	Workspace          primitive.ObjectID `bson:"workspace" json:"workspace"`
	Title              string             `bson:"title" json:"title"`
	Description        string             `bson:"description" json:"description"`
	Type               string             `bson:"type" json:"type"`
	Priority           string             `bson:"priority" json:"priority"`
	Status             string             `bson:"status" json:"status"`
	Source             string             `bson:"source" json:"source"`
	SourceText         string             `bson:"sourceText" json:"sourceText"`
	AcceptanceCriteria []string           `bson:"acceptanceCriteria" json:"acceptanceCriteria"`
	Tags               []string           `bson:"tags" json:"tags"`
	EstimatedEffort    *float64           `bson:"estimatedEffort,omitempty" json:"estimatedEffort,omitempty"`
	IsBaseline         bool               `bson:"isBaseline" json:"isBaseline"`
	BaselineVersion    int                `bson:"baselineVersion" json:"baselineVersion"`
	CreatedBy          primitive.ObjectID `bson:"createdBy" json:"createdBy"`
	UpdatedBy          primitive.ObjectID `bson:"updatedBy" json:"updatedBy"`
	CreatedAt          time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt          time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type RequirementSnapshot struct {
	RequirementID      string   `bson:"requirementId" json:"requirementId"`
	Title              string   `bson:"title" json:"title"`
	Description        string   `bson:"description" json:"description"`
	Type               string   `bson:"type" json:"type"`
	Priority           string   `bson:"priority" json:"priority"`
	Status             string   `bson:"status" json:"status"`
	Source             string   `bson:"source" json:"source"`
	AcceptanceCriteria []string `bson:"acceptanceCriteria" json:"acceptanceCriteria"`
	Tags               []string `bson:"tags" json:"tags"`
	EstimatedEffort    *float64 `bson:"estimatedEffort,omitempty" json:"estimatedEffort,omitempty"`
}

type RequirementVersion struct {
	ID                   primitive.ObjectID    `bson:"_id,omitempty" json:"_id"`
	Project              primitive.ObjectID    `bson:"project" json:"project"`
	Workspace            primitive.ObjectID    `bson:"workspace" json:"workspace"`
	VersionNumber        int                   `bson:"versionNumber" json:"versionNumber"`
	Label                string                `bson:"label" json:"label"`
	Description          string                `bson:"description" json:"description"`
	RequirementsSnapshot []RequirementSnapshot `bson:"requirementsSnapshot" json:"requirementsSnapshot"`
	CreatedBy            primitive.ObjectID    `bson:"createdBy" json:"createdBy"`
	CreatedAt            time.Time             `bson:"createdAt" json:"createdAt"`
}
