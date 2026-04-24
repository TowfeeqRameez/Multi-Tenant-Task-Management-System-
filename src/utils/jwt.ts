import jwt from 'jsonwebtoken';
import { User, Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-jwt';

export interface JwtPayload {
    userId: string;
    organizationId: string;
    role: Role;
}

export const generateToken = (user: User): string => {
    const payload: JwtPayload = {
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
};

export const verifyToken = (token: string): JwtPayload => {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
