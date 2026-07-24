# Payment Failure Runbook

## Symptoms
- Users report Razorpay checkout not opening
- Backend logs show "Failed to create Razorpay order"
- Backend logs show "Razorpay circuit breaker OPENED"

## Investigation Steps

### 1. Check Razorpay Configuration
```bash
# Check backend startup logs
grep "RAZORPAY CONFIGURATION" backend.log

# Should see:
# ✓ Razorpay credentials loaded: KEY_ID=rzp_test_***
# ✓ Using Razorpay TEST MODE
```

**If missing credentials:**
- Check `.env` file has `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
- Verify `ConfigModule.forRoot()` has `isGlobal: true` in `app.module.ts`
- Restart the backend service after fixing `.env`

**If key format warning appears:**
- Verify key starts with `rzp_test_` (test mode) or `rzp_live_` (live mode)
- Check for typos or incorrect key values in `.env`

### 2. Check Razorpay API Health
```bash
curl http://localhost:3000/payments/health
```

**Expected response (healthy):**
```json
{
  "status": "healthy",
  "provider": "razorpay",
  "mode": "test",
  "latency": 234,
  "lastChecked": "2026-07-24T00:00:00.000Z"
}
```

**If degraded (latency > 1000ms):**
- Check network connectivity
- Check Razorpay status: https://status.razorpay.com/
- Monitor for further degradation

**If unhealthy:**
- Test credentials manually: 
  ```bash
  curl -u <key_id>:<key_secret> https://api.razorpay.com/v1/customers?count=1
  ```
- Check Razorpay status page: https://status.razorpay.com/
- Verify API endpoint is not blocked by firewall/proxy

### 3. Check Circuit Breaker Status
```bash
# Look for circuit breaker logs
grep "circuit breaker" backend.log

# States:
# "CLOSED" - API is healthy (normal operation)
# "OPEN" - API is unhealthy (temporarily disabled)
# "HALF-OPEN" - Testing recovery
```

**If circuit breaker is OPEN:**
- It will auto-retry after 30 seconds (resetTimeout)
- Check if Razorpay API is experiencing an outage
- Consider restarting the service to force a reset

### 4. Check Recent Orders
```sql
SELECT 
  order_number, 
  payment_method, 
  payment_status, 
  created_at 
FROM orders 
WHERE payment_method = 'razorpay' 
  AND payment_status = 'PENDING'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### 5. Check Payment Records
```sql
SELECT 
  o.order_number,
  p.razorpay_order_id,
  p.status,
  p.created_at
FROM payments p
JOIN orders o ON o.id = p.order_id
WHERE p.status = 'PENDING'
  AND p.created_at > NOW() - INTERVAL '1 hour'
ORDER BY p.created_at DESC;
```

### 6. Check Payment Metrics
If Prometheus metrics are enabled:
```bash
curl http://localhost:3000/metrics | grep payment_order
```

**Key metrics:**
- `payment_order_creation_total{status="failure"}` - Failure count
- `payment_order_creation_duration_seconds` - API latency distribution

## Resolution Steps

### Invalid Credentials
1. Verify credentials in Razorpay Dashboard (https://dashboard.razorpay.com/)
2. Update `.env` file with correct credentials
3. Restart backend service

### Razorpay API Down
1. Switch to manual order processing
2. Notify users about payment delay
3. Monitor https://status.razorpay.com/
4. Consider temporary COD-only mode

### Circuit Breaker Open (Repeated Failures)
1. Check if Razorpay API is experiencing an outage
2. If API is healthy, check for credential issues
3. Monitor circuit breaker auto-recovery (resets every 30s)
4. If persistent, restart service to force reset

### Webhook Issues
1. Check webhook secret configuration in `.env`
2. Verify webhook URL is accessible and registered in Razorpay Dashboard
3. Check webhook logs in Razorpay Dashboard (Settings → Webhooks)
4. Verify signature verification in backend logs

### Payment Link Fallback Failures
1. Check if Razorpay payment link API is working
2. Verify Razorpay account has payment link feature enabled
3. Check backend logs for "Failed to create payment link"

## Escalation

| Level | Action |
|-------|--------|
| **L1** | Check configuration and health endpoint |
| **L2** | Review backend logs, database, and metrics |
| **L3** | Contact Razorpay support with order IDs and error details |

### Razorpay Support Information
- Support Portal: https://razorpay.com/support/
- Email: support@razorpay.com
- Dashboard: https://dashboard.razorpay.com/

## Common Error Messages

| Error | Likely Cause | Action |
|-------|-------------|--------|
| `Failed to create Razorpay order` | Invalid credentials or API issue | Check credentials and health endpoint |
| `Razorpay circuit breaker OPENED` | Repeated API failures | Check API status, wait for auto-recovery |
| `Invalid webhook signature` | Wrong webhook secret | Verify RAZORPAY_WEBHOOK_SECRET in `.env` |
| `Razorpay not configured` | Missing environment variables | Check `.env` file and ConfigModule setup |
| `Failed to create payment link` | Payment link API issue | Verify Razorpay account features |

## Related Resources
- **Health Endpoint**: `GET /payments/health`
- **Metrics Endpoint**: `GET /metrics` (if Prometheus configured)
- **Backend Logs**: `backend.log` or `journalctl -u rrFashion-backend`
- **Source Code**: `backend/src/modules/payments/`
- **Configuration**: `backend/.env`