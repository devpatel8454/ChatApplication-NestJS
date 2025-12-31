import { Controller, Post, Body, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
    constructor(
        private jwtService: JwtService,
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    @Post('register')
    async register(@Body() body: any) {
        const { username, password } = body;

        const existingUser = await this.userRepository.findOne({ where: { username } });
        if (existingUser) {
            throw new ConflictException('Username already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = this.userRepository.create({
            username,
            password: hashedPassword
        });

        await this.userRepository.save(user);

        // Remove password from response
        const { password: _, ...result } = user;
        return result;
    }

    @Post('login')
    async login(@Body() body: any) {
        const { username, password } = body;
        const user = await this.userRepository.findOne({
            where: { username },
            select: ['id', 'username', 'password']
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordMatching = await bcrypt.compare(password, user.password);
        if (!isPasswordMatching) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = { sub: user.id, username: user.username };
        const { password: _, ...userWithoutPassword } = user;

        return {
            access_token: await this.jwtService.signAsync(payload),
            user: userWithoutPassword,
        };
    }
}
