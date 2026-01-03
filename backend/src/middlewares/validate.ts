import { z } from 'zod/v4'
import { Request, Response, NextFunction } from 'express'

export const validate = <T extends z.ZodType<any, any, any>>
  (schema: T, data: unknown) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (err: any) {
      res.status(400).json({
        message: 'Validation failed',
        errors: err.errors
      })
    }
  }
