import { getOrCreateConnection } from './db';

export const up = async () => {
  const connection = await getOrCreateConnection();

  // write your upgrade script below
};

export const down = async () => {
  const connection = await getOrCreateConnection();

  // write your downgrade script below
};
