import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

export const signup = async (req: Request, res: Response) => {
    try {
        const { email, password, organizationName, roleName } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create organization and user in a transaction
        const [organization, user] = await prisma.$transaction(async (tx) => {
            let org;
            // In a real app we might ask for org ID to join, or create a new one. 
            // For simplicity, we create a new one per signup if provided.
            if (organizationName) {
                org = await tx.organization.findFirst({
                    where: { name: organizationName }
                });

                if (!org) {
                    org = await tx.organization.create({
                        data: { name: organizationName }
                    });
                }
            } else {
                // Find a default org for members joining or error
                throw new Error('Missing organization name');
            }

            const newUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role: roleName === 'ADMIN' ? Role.ADMIN : Role.MEMBER,
                    organizationId: org.id
                }
            });

            return [org, newUser];
        });

        const token = generateToken(user);
        res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId } });
    } catch (error) {
        if (error instanceof Error && error.message === 'Missing organization name') {
            res.status(400).json({ message: error.message });
        } else {
            res.status(500).json({ message: 'Internal server error', error });
        }
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || (!user.password && !user.googleId)) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (user.password) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }
        }

        const token = generateToken(user);
        res.json({ token, user: { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId } });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
};
