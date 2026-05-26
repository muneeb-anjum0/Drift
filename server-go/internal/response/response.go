package response

import "github.com/gin-gonic/gin"

func Success(c *gin.Context, statusCode int, message string, data gin.H) {
	if data == nil {
		data = gin.H{}
	}
	c.JSON(statusCode, gin.H{"success": true, "message": message, "data": data})
}

func Error(c *gin.Context, statusCode int, message string, errors any) {
	if errors == nil {
		errors = []string{}
	}
	c.JSON(statusCode, gin.H{"success": false, "message": message, "errors": errors})
}
