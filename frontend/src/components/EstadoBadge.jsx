import { ESTADOS } from '../constants.js';

export default function EstadoBadge({ estado }) {
  return <span className={`badge badge--${estado}`}>{ESTADOS[estado] ?? estado}</span>;
}