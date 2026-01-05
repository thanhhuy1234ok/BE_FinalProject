import * as bcrypt from 'bcryptjs';

export async function getHashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}

export async function isValidPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
