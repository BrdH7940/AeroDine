import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UserRole } from '@prisma/client'
import * as bcrypt from 'bcrypt'

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    async create(createUserDto: CreateUserDto) {
        const { password, role = UserRole.CUSTOMER, ...rest } = createUserDto
        const passwordHash = await bcrypt.hash(password, 10)

        return this.prisma.user.create({
            data: {
                ...rest,
                role,
                passwordHash,
            },
            select: this.publicSelect(),
        })
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
        })
    }

    async findById(id: number) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: this.publicSelect(),
        })
        if (!user) throw new NotFoundException('User not found')
        return user
    }

    async findAll() {
        return this.prisma.user.findMany({
            select: this.publicSelect(),
        })
    }

    async update(id: number, updateUserDto: UpdateUserDto) {
        const { password, ...rest } = updateUserDto
        const data: any = { ...rest }

        if (password) {
            data.passwordHash = await bcrypt.hash(password, 10)
        }

        return this.prisma.user.update({
            where: { id },
            data,
            select: this.publicSelect(),
        })
    }

    async remove(id: number) {
        return this.prisma.user.delete({
            where: { id },
            select: this.publicSelect(),
        })
    }

    private publicSelect() {
        return {
            id: true,
            email: true,
            fullName: true,
            role: true,
            restaurantId: true,
            createdAt: true,
            updatedAt: true,
        }
    }
}
