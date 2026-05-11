import { IssueStatus, Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../errors/http-error';
import { HTTP_STATUS } from '../../types/api';
import { parsePaginationQuery } from '../../utils/request-parsing';
import {
  parseRequiredStringField,
  parseOptionalStringField,
  parsePositiveIntegerPathParam,
} from '../../utils/validation';
import { toPaginatedResponse } from '../../transformers/user-content';

interface IssueBodyPayload {
  title?: unknown;
  description?: unknown;
  reproductionSteps?: unknown;
  reporterContact?: unknown;
}

interface IssueRecord {
  id: number;
  title: string;
  description: string;
  reproductionSteps: string | null;
  reporterContact: string | null;
  status: IssueStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface IssueResponse {
  id: number;
  title: string;
  description: string;
  reproductionSteps: string | null;
  reporterContact: string | null;
  status: IssueStatus;
  createdAt: string;
  updatedAt: string;
}

const ISSUE_STATUS_VALUES: IssueStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
const VALID_SORT_VALUES = ['createdAt:desc', 'createdAt:asc'] as const;
type IssueSortValue = (typeof VALID_SORT_VALUES)[number];

const getSingleQueryValue = (rawValue: unknown): unknown =>
  Array.isArray(rawValue) ? rawValue[0] : rawValue;

const isIssueStatus = (value: unknown): value is IssueStatus =>
  ISSUE_STATUS_VALUES.includes(value as IssueStatus);

const parseOptionalIssueStatusQuery = (rawValue: unknown): IssueStatus | undefined => {
  const value = getSingleQueryValue(rawValue);
  if (value === undefined) {
    return undefined;
  }

  if (!isIssueStatus(value)) {
    throw new HttpError(
      HTTP_STATUS.badRequest,
      `Query parameter status must be one of: ${ISSUE_STATUS_VALUES.join(', ')}`
    );
  }

  return value;
};

const isIssueSortValue = (value: unknown): value is IssueSortValue =>
  typeof value === 'string' && (VALID_SORT_VALUES as readonly string[]).includes(value);

const parseOptionalSortQuery = (rawValue: unknown): IssueSortValue => {
  const value = getSingleQueryValue(rawValue);
  if (value === undefined) {
    return 'createdAt:desc';
  }

  if (!isIssueSortValue(value)) {
    throw new HttpError(
      HTTP_STATUS.badRequest,
      `Query parameter sort must be one of: ${VALID_SORT_VALUES.join(', ')}`
    );
  }

  return value;
};

const toIssueResponse = (issue: IssueRecord): IssueResponse => ({
  id: issue.id,
  title: issue.title,
  description: issue.description,
  reproductionSteps: issue.reproductionSteps,
  reporterContact: issue.reporterContact,
  status: issue.status,
  createdAt: issue.createdAt.toISOString(),
  updatedAt: issue.updatedAt.toISOString(),
});

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

/**
 * Admin-gated paginated list of bug reports.
 *
 * Defaults: page=1, pageSize=10 (max 50, enforced by `parsePaginationQuery`),
 * sort=createdAt:desc. Optional `status` filter restricts to one IssueStatus value.
 */
export const listIssues = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = request.query as Record<string, unknown>;
    const { page, pageSize, skip, take } = parsePaginationQuery(query);
    const status = parseOptionalIssueStatusQuery(query.status);
    const sort = parseOptionalSortQuery(query.sort);

    const direction: Prisma.SortOrder = sort === 'createdAt:asc' ? 'asc' : 'desc';
    const where: Prisma.IssueWhereInput = status !== undefined ? { status } : {};

    const [totalResults, issues] = await prisma.$transaction([
      prisma.issue.count({ where }),
      prisma.issue.findMany({
        where,
        orderBy: [{ createdAt: direction }, { id: direction }],
        skip,
        take,
      }),
    ]);

    response.status(200).json(
      toPaginatedResponse({
        page,
        pageSize,
        totalResults,
        results: issues.map((issue) => toIssueResponse(issue)),
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Admin-gated single bug report lookup. Returns 400 when the path id is not a
 * positive integer and 404 when the row does not exist.
 */
export const getIssueById = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  const issueId = parsePositiveIntegerPathParam(request.params.id);
  if (issueId === null) {
    next(new HttpError(HTTP_STATUS.badRequest, 'Issue id must be a positive integer'));
    return;
  }

  try {
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });

    if (!issue) {
      next(new HttpError(HTTP_STATUS.notFound, 'Issue not found'));
      return;
    }

    response.status(200).json(toIssueResponse(issue));
  } catch (error) {
    next(error);
  }
};

interface IssueUpdatePayload {
  status?: unknown;
}

/**
 * Admin-gated partial-merge update. Currently only `status` is mutable; an
 * empty body returns the unchanged issue with 200. Unknown status values are
 * rejected with 400.
 */
export const updateIssue = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  const issueId = parsePositiveIntegerPathParam(request.params.id);
  if (issueId === null) {
    next(new HttpError(HTTP_STATUS.badRequest, 'Issue id must be a positive integer'));
    return;
  }

  try {
    const payload = (request.body ?? {}) as IssueUpdatePayload;
    const data: Prisma.IssueUpdateInput = {};

    if (payload.status !== undefined) {
      if (!isIssueStatus(payload.status)) {
        next(
          new HttpError(
            HTTP_STATUS.badRequest,
            `status must be one of: ${ISSUE_STATUS_VALUES.join(', ')}`
          )
        );
        return;
      }
      data.status = payload.status;
    }

    const existing = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!existing) {
      next(new HttpError(HTTP_STATUS.notFound, 'Issue not found'));
      return;
    }

    const issue =
      Object.keys(data).length === 0
        ? existing
        : await prisma.issue.update({ where: { id: issueId }, data });

    response.status(200).json(toIssueResponse(issue));
  } catch (error) {
    next(error);
  }
};

/**
 * Admin-gated delete. Returns 204 on success and 404 when the row does not exist.
 */
export const deleteIssue = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  const issueId = parsePositiveIntegerPathParam(request.params.id);
  if (issueId === null) {
    next(new HttpError(HTTP_STATUS.badRequest, 'Issue id must be a positive integer'));
    return;
  }

  try {
    const existing = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { id: true },
    });

    if (!existing) {
      next(new HttpError(HTTP_STATUS.notFound, 'Issue not found'));
      return;
    }

    await prisma.issue.delete({ where: { id: issueId } });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
};
