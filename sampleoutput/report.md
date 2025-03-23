# Properties Comparison Report

## Files Compared

1. config1.properties (/Users/zackdawood/Documents/Dev/GitHub/properties-comparator/test/config1.properties)
2. config2.yml (/Users/zackdawood/Documents/Dev/GitHub/properties-comparator/test/config2.yml)

## Comparison Results

| Key | Matched | File 1: config1.properties | File 2: config2.yml |
| --- | --- | --- | --- |
| app.name | Yes | MyApplication | MyApplication |
| app.version | Yes | 1.0.0 | 1.0.0 |
| app.environment | Yes | development | development |
| db.host | Yes | localhost | localhost |
| db.port | Yes | 3306 | 3306 |
| db.username | Yes | root | root |
| db.password | No | password123 | password321 |
| db.name | Yes | my_database | my_database |
| log.level | Yes | INFO | INFO |
| log.filepath | Yes | /var/log/myapplication.log | /var/log/myapplication.log |
| api.url | Yes | https://api.example.com | https://api.example.com |
| api.timeout | Yes | 5000 | 5000 |
| api.key | Yes | abcd1234efgh5678ijkl | abcd1234efgh5678ijkl |
| feature.newUI.enabled | Yes | true | true |
| feature.betaFeature.enabled | Yes | false | false |
| feature.advancedSearch.enabled | Yes | true | true |
| email.host | Yes | smtp.example.com | smtp.example.com |
| email.port | Yes | 587 | 587 |
| email.username | Yes | noreply@example.com | noreply@example.com |
| email.password | Yes | securepassword | securepassword |
| email.from | Yes | noreply@example.com | noreply@example.com |

## Summary

❌ 1 key(s) have mismatched values.

**Mismatched keys:** db.password
