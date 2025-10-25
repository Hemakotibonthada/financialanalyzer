# Admin Dashboard Documentation

## Overview

The Admin Dashboard provides comprehensive system management and monitoring capabilities for the Financial Analyzer application. Only users with the `admin` role can access this dashboard.

## Features

### 1. **Dashboard Overview**
- **User Statistics**: Total users, active/inactive counts, recent registrations
- **Document Statistics**: Total documents uploaded, breakdown by type
- **Transaction Statistics**: Total transactions, volume analysis (debit/credit)
- **System Health**: Server uptime, memory usage, CPU stats

### 2. **User Management**
- View all registered users with pagination
- Search users by name or email
- Filter by status (active/inactive) and role (user/admin)
- Edit user details (name, email, role, status)
- Toggle user active/inactive status
- Delete users (removes all associated data)
- View user statistics (documents, transactions)

### 3. **Document Management**
- View all uploaded documents across all users
- Filter by status and type
- See document processing status
- View which user uploaded each document

### 4. **Analytics & Insights**
- User growth trends (last 30 days)
- Document upload patterns
- Transaction trends
- Top users by transaction volume

### 5. **System Health Monitoring**
- Real-time memory usage
- System information (platform, CPUs, architecture)
- Database connection status
- Server uptime tracking
- System cleanup tools

### 6. **Operational Controls**
- System cleanup (remove orphaned files, invalid data)
- Refresh all statistics
- Database health checks

## Access Control

### Making a User Admin

Use the provided script to grant admin privileges:

```bash
cd backend
node make-admin.js <user-email>
```

Example:
```bash
node make-admin.js hemakotibonthada@gmail.com
```

### Listing All Users

To view all users in the system:

```bash
cd backend
node list-users.js
```

## API Endpoints

All admin endpoints require authentication and admin role. Base path: `/api/admin`

### Dashboard Statistics
- **GET** `/dashboard/stats` - Get comprehensive system statistics

### User Management
- **GET** `/users` - Get all users (with pagination and filters)
  - Query params: `page`, `limit`, `search`, `status`, `role`
- **PUT** `/users/:id` - Update user details
- **DELETE** `/users/:id` - Delete user and all data
- **POST** `/users/:id/toggle-status` - Toggle user active status

### Document Management
- **GET** `/documents` - Get all documents
  - Query params: `page`, `limit`, `status`, `type`

### System Health
- **GET** `/system/health` - Get system health metrics
- **POST** `/system/cleanup` - Run system cleanup

### Analytics
- **GET** `/analytics/overview` - Get analytics overview
  - Query params: `days` (default: 30)

### Utilities
- **POST** `/broadcast` - Broadcast message (future notification system)
- **GET** `/logs` - Get system logs
  - Query params: `lines` (default: 100)

## Frontend Access

### Navigation

Admin users will see an "Admin Panel" button in the main navigation bar:

```jsx
{user?.role === 'admin' && (
  <Link to="/admin">
    <Shield /> Admin Panel
  </Link>
)}
```

### Route

The admin dashboard is available at:
- **Local**: http://localhost:3000/admin
- **Network**: http://<your-ip>:3000/admin

## Security Features

1. **Middleware Protection**: All admin routes protected by `isAdmin` middleware
2. **Authentication Required**: Must be logged in with valid JWT token
3. **Role-Based Access**: Only users with `role: 'admin'` can access
4. **Self-Protection**: Admins cannot delete their own accounts
5. **Audit Logging**: All admin actions are logged

## User Interface

### Overview Tab
- Quick statistics cards (users, documents, transactions, system)
- Recent users table
- System metrics

### User Management Tab
- Search and filter controls
- User table with actions (edit, toggle status, delete)
- Pagination controls
- User statistics (documents, transactions)

### Documents Tab
- All documents across all users
- Document status and type
- Pagination support

### Analytics Tab
- User growth visualization
- Top users by volume
- Transaction trends

### System Health Tab
- Memory usage gauge
- System information cards
- Database status
- Maintenance tools (cleanup, refresh)

## Common Operations

### Activating/Deactivating Users

```javascript
// Via UI: Click the lock/unlock icon in user table
// Via API:
POST /api/admin/users/:userId/toggle-status
```

### Deleting a User

```javascript
// Via UI: Click the trash icon (requires confirmation)
// Via API:
DELETE /api/admin/users/:userId
```

**Note**: This permanently deletes:
- User account
- All documents (and physical files)
- All transactions
- All financial profiles
- All EMI records
- All bill reminders

### Running System Cleanup

```javascript
// Via UI: Click "Run Cleanup" in System Health tab
// Via API:
POST /api/admin/system/cleanup
```

This removes:
- Documents with missing files
- Transactions for deleted users
- Orphaned data

## Statistics and Metrics

### User Metrics
- Total registered users
- Active vs inactive users
- Admin vs regular user counts
- Recent registrations
- User growth over time

### Document Metrics
- Total documents uploaded
- Documents by type
- Documents by status
- Upload trends

### Transaction Metrics
- Total transactions
- Total volume (debit/credit)
- Net transaction value
- Transaction trends

### System Metrics
- Memory usage (used/total/percentage)
- Server uptime
- CPU count and architecture
- Platform information
- Database collections

## Best Practices

1. **Regular Monitoring**: Check system health regularly
2. **User Verification**: Verify new users before granting permissions
3. **Data Cleanup**: Run system cleanup periodically
4. **Backup First**: Always backup before bulk deletions
5. **Audit Logs**: Review logs for suspicious activity
6. **Resource Management**: Monitor memory and CPU usage

## Troubleshooting

### Can't Access Admin Dashboard

1. Verify user has admin role:
   ```bash
   node backend/list-users.js
   ```

2. Make user admin if needed:
   ```bash
   node backend/make-admin.js <email>
   ```

3. Clear browser cache and re-login

### 403 Forbidden Error

- Ensure you're logged in
- Verify your account has `role: 'admin'`
- Check JWT token is valid

### System Cleanup Not Working

- Check file permissions
- Verify database connection
- Review server logs

## Future Enhancements

- [ ] Real-time notifications system
- [ ] Activity audit trail
- [ ] Email notifications for admin actions
- [ ] Scheduled system maintenance
- [ ] Data export/import tools
- [ ] Advanced reporting
- [ ] User activity monitoring
- [ ] API rate limiting controls

## Support

For issues or questions:
1. Check server logs: `backend/logs/combined.log`
2. Review error messages in browser console
3. Verify database connectivity
4. Check backend server is running on port 5001

## Security Notes

⚠️ **Important**:
- Keep admin credentials secure
- Use strong passwords for admin accounts
- Regularly review user permissions
- Monitor system logs for unauthorized access
- Backup database before major operations
- Test operations in development first

---

**Version**: 1.0  
**Last Updated**: October 25, 2025  
**Author**: FinancialAnalyzer Team
