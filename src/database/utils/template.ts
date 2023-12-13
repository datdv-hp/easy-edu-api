import { getOrCreateConnection } from './db';

export const up = async () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const connection = await getOrCreateConnection();

  // write your upgrade script below
};

export const down = async () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const connection = await getOrCreateConnection();

  // write your downgrade script below
};
