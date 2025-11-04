import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Panorama API Documentation",
      version: "1.0.0",
      description: "Combined API documentation for Invoice + PostgreSQL modules",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
  },
  apis: [
    "./routes/*.js",           // PostgreSQL routes in root
    "./invoice/routes/*.js",   // Invoice module routes
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
export { swaggerUi };
