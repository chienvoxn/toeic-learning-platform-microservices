import { describe, it, expect } from 'vitest';
import * as z from 'zod';

const loginSchema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email').email('Địa chỉ email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

const registerSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Tên hiển thị tối thiểu 2 ký tự')
    .max(120, 'Tên hiển thị tối đa 120 ký tự'),
  email: z.string().min(1, 'Vui lòng nhập email').email('Địa chỉ email không hợp lệ'),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có tối thiểu 8 ký tự')
    .max(72, 'Mật khẩu tối đa 72 ký tự'),
});

describe('Authentication Form Schemas', () => {
  it('validates correct login credentials', () => {
    const valid = loginSchema.safeParse({
      email: 'learner@toeic.edu.vn',
      password: 'password123',
    });
    expect(valid.success).toBe(true);
  });

  it('rejects invalid emails in login form', () => {
    const invalid = loginSchema.safeParse({
      email: 'invalid-email',
      password: 'password123',
    });
    expect(invalid.success).toBe(false);
  });

  it('rejects passwords shorter than 8 characters during registration', () => {
    const invalid = registerSchema.safeParse({
      displayName: 'Nguyen Van A',
      email: 'learner@toeic.edu.vn',
      password: 'short',
    });
    expect(invalid.success).toBe(false);
  });

  it('accepts valid registration payload', () => {
    const valid = registerSchema.safeParse({
      displayName: 'Tran Thi B',
      email: 'user.test@toeic.com',
      password: 'securePassword2026',
    });
    expect(valid.success).toBe(true);
  });
});
