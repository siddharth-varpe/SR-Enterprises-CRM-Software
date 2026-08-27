import { test, expect } from '@playwright/test';

test.describe('SR Enterprises CRM - Module Integrity & Health', () => {
  test('API health check probe responds with status OK', async ({ request }) => {
    const response = await request.get('http://localhost:4000/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('Public website lead inquiry endpoint accepts inquiries with captcha challenge', async ({ request }) => {
    // 1. Fetch challenge
    const capRes = await request.get('http://localhost:4000/api/v1/public/captcha');
    expect(capRes.ok()).toBeTruthy();
    const capData = await capRes.json();
    const svg: string = capData.data.svg;
    const matches = [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)];
    const captchaCode = matches.map((m) => m[1]).join('');

    // 2. Submit inquiry
    const response = await request.post('http://localhost:4000/api/v1/public/inquiries', {
      data: {
        fullName: 'Test Lead Prospect',
        phone: '9876543210',
        email: 'prospect@example.com',
        city: 'Mumbai',
        serviceType: 'INSTALLATION',
        productInterest: 'Kent Grand Plus RO',
        message: 'Interested in RO purifier installation.',
        captchaChallengeId: capData.data.challengeId,
        captchaCode,
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
