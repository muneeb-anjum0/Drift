import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator.js';
import * as mongoProjectService from '../services/project.service.js';
import * as firestoreProjectService from '../services/firestoreProject.service.js';

const USE_FIRESTORE = process.env.USE_FIRESTORE === 'true';

// For now, keep using MongoDB for projects until Firestore is fully migrated
const projectService = mongoProjectService;

export const createProjectController = asyncHandler(async (req: Request, res: Response) => {
  const payload = createProjectSchema.parse(req.body);
  const project = await projectService.createProject(req.user!.id, payload);
  res.status(201).json(new ApiResponse('Project created', { project }));
});

export const listProjectsController = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;
  const projects = await projectService.getProjects(req.user!.id, workspaceId);
  res.status(200).json(new ApiResponse('Projects fetched', { projects }));
});

export const getProjectController = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params as { projectId: string };
  const project = await projectService.getProjectById(projectId, req.user!.id);
  res.status(200).json(new ApiResponse('Project fetched', { project }));
});

export const updateProjectController = asyncHandler(async (req: Request, res: Response) => {
  const payload = updateProjectSchema.parse(req.body);
  const { projectId } = req.params as { projectId: string };
  const project = await projectService.updateProject(projectId, req.user!.id, payload);
  res.status(200).json(new ApiResponse('Project updated', { project }));
});

export const deleteProjectController = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params as { projectId: string };
  await projectService.deleteProject(projectId, req.user!.id);
  res.status(200).json(new ApiResponse('Project deleted', {}));
});
