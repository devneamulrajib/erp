/* global describe, test, expect */
import { errMsg } from '../src/utils/format';

describe('errMsg', () => {
  test('server message wins', () => expect(errMsg({ response: { data: { message: 'Invalid credentials' } } })).toBe('Invalid credentials'));
  test('plain network error', () => expect(errMsg({ message: 'Network Error', code: 'ERR_NETWORK', request: { _response: 'Unable to resolve host "api.erp.mwm247.com"' } })).toMatch(/check your internet/));
  test('TLS trust failure', () => expect(errMsg({ message: 'Network Error', code: 'ERR_NETWORK', request: { _response: 'java.security.cert.CertPathValidatorException: Trust anchor for certification path not found.' } })).toMatch(/Secure connection failed/));
  test('timeout', () => expect(errMsg({ code: 'ECONNABORTED', message: 'timeout of 20000ms exceeded' })).toMatch(/too long/));
  test('fallback', () => expect(errMsg(new Error('x'), 'Login failed')).toBe('Login failed'));
});
