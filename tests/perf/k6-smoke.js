/* global __ENV */
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 2,
  duration: '10s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500']
  }
};

export default function () {
  const res = http.get(`${__ENV.K6_BASE_URL || 'http://127.0.0.1:4173'}/`);
  check(res, { 'status is 200': (r) => r.status === 200 });
}
