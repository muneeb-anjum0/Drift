package utils

import (
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

var ErrInvalidID = errors.New("invalid object id")

func ObjectID(value string) (primitive.ObjectID, error) {
	id, err := primitive.ObjectIDFromHex(value)
	if err != nil {
		return primitive.NilObjectID, ErrInvalidID
	}
	return id, nil
}

func NewID() primitive.ObjectID {
	return primitive.NewObjectID()
}
