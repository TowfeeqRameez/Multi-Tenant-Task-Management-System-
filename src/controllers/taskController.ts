import { Request, Response } from 'express';
import { PrismaClient, ActionType, TaskStatus, Role } from '@prisma/client';
import { getIO } from '../utils/socket';

const prisma = new PrismaClient();

export const createTask = async (req: Request, res: Response) => {
    try {
        const { title, description } = req.body;
        const userId = req.user!.userId;
        const organizationId = req.user!.organizationId;

        const task = await prisma.$transaction(async (tx) => {
            const newTask = await tx.task.create({
                data: {
                    title,
                    description,
                    creatorId: userId,
                    organizationId: organizationId,
                }
            });

            await tx.taskAuditLog.create({
                data: {
                    taskId: newTask.id,
                    action: ActionType.CREATED,
                    userId,
                    details: { title, description }
                }
            });

            return newTask;
        });

        getIO().to(organizationId).emit('task_changed');

        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
};

export const getTasks = async (req: Request, res: Response) => {
    try {
        const user = req.user!;

        const whereClause: any = { organizationId: user.organizationId };

        if (user.role === Role.MEMBER) {
            whereClause.creatorId = user.userId;
        }

        const tasks = await prisma.task.findMany({
            where: whereClause
        });

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
};

export const updateTask = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { title, description, status } = req.body;
        const user = req.user!;

        let task = await prisma.task.findUnique({ where: { id } });

        if (!task || task.organizationId !== user.organizationId) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (user.role === Role.MEMBER && task.creatorId !== user.userId) {
            return res.status(403).json({ message: 'Forbidden: You can only update your own tasks' });
        }

        task = await prisma.$transaction(async (tx) => {
            const updatedTask = await tx.task.update({
                where: { id },
                data: { title, description, status }
            });

            await tx.taskAuditLog.create({
                data: {
                    taskId: id,
                    action: ActionType.UPDATED,
                    userId: user.userId,
                    details: { title, description, status }
                }
            });

            return updatedTask;
        });

        getIO().to(user.organizationId).emit('task_changed');

        res.json(task);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
};

export const deleteTask = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const user = req.user!;

        const task = await prisma.task.findUnique({ where: { id } });

        if (!task || task.organizationId !== user.organizationId) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (user.role === Role.MEMBER && task.creatorId !== user.userId) {
            return res.status(403).json({ message: 'Forbidden: You can only delete your own tasks' });
        }

        await prisma.$transaction(async (tx) => {
            // Must delete audit logs first or rely on Cascade delete!
            // Since we have Cascade delete on TaskAuditLog, we can just delete task directly, 
            // but if we want to retain the log conceptually we wouldn't cascade. 
            // Assuming we keep the log before deletion:

            // We will perform deletion (cascade takes care of logs)
            await tx.task.delete({ where: { id } });
        });

        getIO().to(user.organizationId).emit('task_changed');

        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
};

export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const user = req.user!;

        const task = await prisma.task.findUnique({ where: { id } });

        if (!task || task.organizationId !== user.organizationId) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const logs = await prisma.taskAuditLog.findMany({
            where: { taskId: id },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { email: true, role: true } } }
        });

        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
};
