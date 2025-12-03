import * as bcrypt from 'bcryptjs';

export async function getHashPassword(password: string) {
  var salt = bcrypt.genSaltSync(10);
  var hash = bcrypt.hashSync(password, salt);
  return hash;
}

export async function isValidPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
