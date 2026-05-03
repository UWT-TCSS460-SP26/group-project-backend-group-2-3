import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { parseRequiredStringField, parseOptionalStringField } from '../../utils/validation';

interface IssueBodyPayload {
  title?: unknown;
  description?: unknown;
  reproductionSteps?: unknown;
  reporterContact?: unknown;
}

export const createIssue = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = request.body as IssueBodyPayload;

    const title = parseRequiredStringField(payload.title, 'title');
    const description = parseRequiredStringField(payload.description, 'description');
    const reproductionSteps = parseOptionalStringField(
      payload.reproductionSteps,
      'reproductionSteps'
    );
    const reporterContact = parseOptionalStringField(payload.reporterContact, 'reporterContact');

    const issue = await prisma.issue.create({
      data: { title, description, reproductionSteps, reporterContact },
    });

    response.status(201).json({
      id: issue.id,
      status: issue.status,
      createdAt: issue.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
