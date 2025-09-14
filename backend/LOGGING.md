# Logging System Documentation

## Overview

The GAMCAPP backend now includes a comprehensive logging system that provides:

- **Daily log rotation** with configurable size limits
- **Automatic archiving** and compression of old logs
- **Structured logging** with context information
- **Multiple log levels** (INFO, WARNING, ERROR, DEBUG)
- **Automatic cleanup** based on retention policies

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```env
# Logging Configuration
LOG_MAX_SIZE=104857600        # Maximum log file size in bytes (default: 100MB)
LOG_STORE_DURATION=2592000    # Log retention period in seconds (default: 30 days)
```

### Default Values

- **LOG_MAX_SIZE**: 104,857,600 bytes (100MB)
- **LOG_STORE_DURATION**: 2,592,000 seconds (30 days)

## Log File Structure

```
backend/
├── logs/
│   ├── app-2024-02-15.log      # Daily log files
│   ├── app-2024-02-15_14-30-25.log  # Rotated files (when size limit exceeded)
│   └── archive/
│       └── logs_2024-01.zip    # Monthly archived logs
```

## Log Levels

- **INFO**: General application events (successful operations)
- **WARNING**: Potentially harmful situations (validation failures)
- **ERROR**: Error events that don't stop the application
- **DEBUG**: Detailed information for debugging

## Usage in Controllers

### PaymentController Logging

The system logs:

- Payment order creation attempts
- Successful order creation with details
- Payment verification events
- Razorpay integration errors
- Configuration issues

Example log entries:
```
[2024-02-15 14:30:25] [INFO] Payment order creation started | Context: {"user_id":123,"appointment_id":"456","ip_address":"192.168.1.1"}
[2024-02-15 14:30:26] [INFO] Payment order created successfully | Context: {"user_id":123,"order_id":"order_abc123","amount":50000,"currency":"INR"}
```

### AppointmentController Logging

The system logs:

- Appointment creation attempts
- Validation failures with missing fields
- Successful appointment creation
- Draft saving operations
- Database operation errors

Example log entries:
```
[2024-02-15 14:25:10] [INFO] Appointment creation started | Context: {"user_id":123,"appointment_type":"General Medical","medical_center":"Test Center"}
[2024-02-15 14:25:11] [INFO] Appointment created successfully | Context: {"user_id":123,"appointment_id":789,"appointment_type":"General Medical"}
```

## Log Rotation and Archiving

### Daily Rotation
- New log file created each day: `app-YYYY-MM-DD.log`
- When file exceeds `LOG_MAX_SIZE`, it's rotated with timestamp: `app-YYYY-MM-DD_HH-mm-ss.log`

### Automatic Archiving
- Files older than `LOG_STORE_DURATION` are compressed into monthly ZIP files
- Archive location: `logs/archive/logs_YYYY-MM.zip`
- Original log files are deleted after successful archiving

### Cleanup
- Archive files older than 6x the `LOG_STORE_DURATION` are automatically deleted
- This provides long-term storage while preventing disk space issues

## Security Considerations

- **Sensitive Data**: Passport numbers are partially masked (first 4 characters only)
- **IP Addresses**: Logged for security audit trails
- **Error Stack Traces**: Included in ERROR level logs for debugging
- **No Passwords**: Authentication tokens and passwords are never logged

## Testing the Logging System

Run the test script to verify logging functionality:

```bash
cd backend
php test-logging.php
```

This will:
- Create sample log entries
- Test all log levels
- Verify file creation
- Display log file information

## Monitoring Log Files

### View Today's Logs
```bash
tail -f backend/logs/app-$(date +%Y-%m-%d).log
```

### Search for Specific Events
```bash
grep "Payment order created" backend/logs/app-*.log
grep "ERROR" backend/logs/app-*.log
```

### Check Log File Sizes
```bash
ls -lh backend/logs/
```

## Best Practices

1. **Structured Logging**: Always include relevant context in log entries
2. **Appropriate Levels**: Use INFO for normal operations, WARNING for issues, ERROR for failures
3. **Security**: Never log sensitive information like passwords or full payment details
4. **Performance**: Logging is asynchronous and shouldn't impact application performance
5. **Monitoring**: Regularly check log files for errors and unusual patterns

## Integration with External Tools

The log format is compatible with:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Fluentd** for log forwarding
- **Grafana** for visualization
- **Log monitoring services** like Datadog, New Relic

The structured JSON context makes logs easily parseable by these tools.