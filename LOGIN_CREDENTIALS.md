# Login Credentials

## Quick Reference Table

| Role | Name | Username/ID | Password | Department/Class |
|------|------|-------------|----------|------------------|
| **Admin** | Administrator | `admin` | `Admin@2024` | Full Access |
| **Faculty** | Dr. John Smith | `john.smith` | `JohnS@2024` | Computer Science |
| **Faculty** | Prof. Sarah Johnson | `sarah.johnson` | `SarahJ@2024` | Mathematics |
| **Faculty** | Dr. Michael Brown | `michael.brown` | `MichaelB@2024` | Physics |
| **Faculty** | Prof. Emily Davis | `emily.davis` | `EmilyD@2024` | Engineering |
| **Student** | Alice Johnson | `alice.johnson` | `Alice@2024` | CS - Year 2 |
| **Student** | Bob Smith | `bob.smith` | `Bob@2024` | CS - Year 2 |
| **Student** | Carol Williams | `carol.williams` | `Carol@2024` | CS - Year 2 |
| **Student** | David Brown | `david.brown` | `David@2024` | CS - Year 2 |
| **Student** | Emma Davis | `emma.davis` | `Emma@2024` | CS - Year 2 |

---

## Default Test Accounts

### Admin Account
- **Admin ID**: `admin`
- **Password**: `Admin@2024`
- **Access**: Full system access including user management, system settings, and all faculty features

### Faculty Accounts

#### Computer Science Department
- **Name**: Dr. John Smith
- **Faculty ID**: `john.smith` or `fac-cs-001`
- **Password**: `JohnS@2024`
- **Email**: john.smith@university.edu
- **Department**: Computer Science
- **Specialization**: Data Structures & Algorithms

#### Mathematics Department
- **Name**: Prof. Sarah Johnson
- **Faculty ID**: `sarah.johnson` or `fac-math-001`
- **Password**: `SarahJ@2024`
- **Email**: sarah.johnson@university.edu
- **Department**: Mathematics
- **Specialization**: Calculus & Linear Algebra

#### Physics Department
- **Name**: Dr. Michael Brown
- **Faculty ID**: `michael.brown` or `fac-phy-001`
- **Password**: `MichaelB@2024`
- **Email**: michael.brown@university.edu
- **Department**: Physics
- **Specialization**: Quantum Mechanics

#### Engineering Department
- **Name**: Prof. Emily Davis
- **Faculty ID**: `emily.davis` or `fac-eng-001`
- **Password**: `EmilyD@2024`
- **Email**: emily.davis@university.edu
- **Department**: Engineering
- **Specialization**: Software Engineering

**Access**: All faculty members have access to student monitoring, test creation, alerts, drift polls, and simulator

### Student Accounts

#### Pre-loaded Students (from app.js)

1. **Alice Johnson**
   - **Student ID**: `alice.johnson` or `alice` or `student-1`
   - **Password**: `Alice@2024`
   - **Email**: alice.johnson@university.edu
   - **Class**: Computer Science - Year 2
   - **Student Number**: STU001

2. **Bob Smith**
   - **Student ID**: `bob.smith` or `bob` or `student-2`
   - **Password**: `Bob@2024`
   - **Email**: bob.smith@university.edu
   - **Class**: Computer Science - Year 2
   - **Student Number**: STU002

3. **Carol Williams**
   - **Student ID**: `carol.williams` or `carol` or `student-3`
   - **Password**: `Carol@2024`
   - **Email**: carol.williams@university.edu
   - **Class**: Computer Science - Year 2
   - **Student Number**: STU003

4. **David Brown**
   - **Student ID**: `david.brown` or `david` or `student-4`
   - **Password**: `David@2024`
   - **Email**: david.brown@university.edu
   - **Class**: Computer Science - Year 2
   - **Student Number**: STU004

5. **Emma Davis**
   - **Student ID**: `emma.davis` or `emma` or `student-5`
   - **Password**: `Emma@2024`
   - **Email**: emma.davis@university.edu
   - **Class**: Computer Science - Year 2
   - **Student Number**: STU005

## Quick Login Guide

### For Students:
1. Click the "Student" role button on the login page
2. Enter the student username (e.g., `alice.johnson` or just `alice`)
3. Enter the corresponding password (e.g., `Alice@2024`)
4. Click "Sign In"

**Example:**
- Username: `alice.johnson`
- Password: `Alice@2024`

### For Faculty:
1. Click the "Faculty" role button on the login page
2. Enter faculty username (e.g., `john.smith` for Computer Science)
3. Select the corresponding department from dropdown
4. Enter the password (e.g., `JohnS@2024`)
5. Click "Sign In"

**Examples:**
- **Computer Science**: Username: `john.smith`, Password: `JohnS@2024`, Department: Computer Science
- **Mathematics**: Username: `sarah.johnson`, Password: `SarahJ@2024`, Department: Mathematics
- **Physics**: Username: `michael.brown`, Password: `MichaelB@2024`, Department: Physics
- **Engineering**: Username: `emily.davis`, Password: `EmilyD@2024`, Department: Engineering

### For Admin:
1. Click the "Admin" role button on the login page
2. Enter Admin ID: `admin`
3. Enter password: `Admin@2024`
4. Click "Sign In"

## Notes

- **Password Validation**: Currently, the system accepts any password for demo purposes. In production, proper authentication would be required.
- **Student Name Recognition**: The system is smart - you can enter a student's first name (like `alice`), their ID (`student-1`), or just a number (`1`) and it will find the correct student.
- **Creating New Users**: Admin can create new students and faculty through the "Add User" button in the Admin Control Panel.
- **Data Persistence**: Student data is stored in browser localStorage, so it persists across sessions on the same browser.

## Admin Features

Once logged in as admin, you can:
- View all students and faculty members
- Create new student or faculty accounts
- Edit student information
- Delete users from the system
- Monitor system health
- View platform analytics
- Access all faculty features (tests, alerts, polls, etc.)

## Testing Workflow

1. **Login as Admin** → Create some test users → View system overview
2. **Login as Faculty** → Create tests → View student performance → Check alerts
3. **Login as Student** → Take tests → View results → Check feedback
4. **Login as Admin again** → See the new data reflected in the admin dashboard
