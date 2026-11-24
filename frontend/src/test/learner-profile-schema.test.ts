import { describe, it, expect } from 'vitest';
import * as z from 'zod';

const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Tên hiển thị phải có từ 2 ký tự trở lên')
    .max(120, 'Tên hiển thị tối đa 120 ký tự'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu mới tối thiểu 8 ký tự')
      .max(72, 'Mật khẩu mới tối đa 72 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không trùng khớp',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
    path: ['newPassword'],
  });

describe('Learner Profile and Password Schemas', () => {
  it('validates displayName length boundaries', () => {
    expect(profileSchema.safeParse({ displayName: 'A' }).success).toBe(false);
    expect(profileSchema.safeParse({ displayName: 'Le' }).success).toBe(true);
    expect(profileSchema.safeParse({ displayName: 'Nguyen Van A' }).success).toBe(true);
  });

  it('rejects identical new password and current password', () => {
    const res = passwordSchema.safeParse({
      currentPassword: 'password123',
      newPassword: 'password123',
      confirmPassword: 'password123',
    });
    expect(res.success).toBe(false);
  });

  it('rejects mismatched new password confirmation', () => {
    const res = passwordSchema.safeParse({
      currentPassword: 'password123',
      newPassword: 'newPassword456',
      confirmPassword: 'differentPassword789',
    });
    expect(res.success).toBe(false);
  });

  it('accepts valid password change request', () => {
    const res = passwordSchema.safeParse({
      currentPassword: 'password123',
      newPassword: 'newSecurePassword2026',
      confirmPassword: 'newSecurePassword2026',
    });
    expect(res.success).toBe(true);
  });
});
