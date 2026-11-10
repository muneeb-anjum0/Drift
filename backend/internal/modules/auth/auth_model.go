package auth

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Name            string             `bson:"name" json:"name"`
	Email           string             `bson:"email" json:"email"`
	PasswordHash    string             `bson:"passwordHash,omitempty" json:"-"`
	Avatar          string             `bson:"avatar" json:"avatar"`
	IsEmailVerified bool               `bson:"isEmailVerified" json:"isEmailVerified"`
	CreatedAt       time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt       time.Time          `bson:"updatedAt" json:"updatedAt"`
}
