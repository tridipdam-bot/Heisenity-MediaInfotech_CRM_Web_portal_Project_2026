import express from "express"
import { Request, Response } from "express";
import swaggerJSDoc from "swagger-jsdoc"
import swaggerUi from "swagger-ui-express"
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3001;

const router = express.Router()

const options:swaggerJSDoc.Options = {
    swaggerDefinition: {
        openapi: "3.0.0",
        info: {
            title: "CRM Application",
            version: "1.0.0",
            description: "CRM application API documentaion"
        },
        tags: [
            {
            name: "index",
            description: "Health check and Test API"
            }
        ],
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: "Development server"
            }
        ],
        components: {
            securitySchemes: {
                Bearer: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "JWT key authorization for API"
                },
                ApiKeyAuth: {
                    type: "apikey",
                    in: "header",
                    name: "x-api-key",
                    description: "API key authorization for API"
                }
            }
        }
    },
    apis: ["./src/routes/*.ts"]
}

const swaggerSpecs = swaggerJSDoc(options)

require("swagger-model-validator")(swaggerSpecs)

router.get("/json", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json")
    res.send(swaggerSpecs)
})

router.use("/", swaggerUi.serve, swaggerUi.setup(swaggerSpecs))

export default router 