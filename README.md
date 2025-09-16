# Do or Dare - Pumpfun Challenge Platform

A dynamic web platform where users can submit dares, vote on them, and administrators can manage which dares become active challenges.

## Features

### 🎯 Core Functionality
- **Dare Submission**: Users can submit new dares with initial reward amounts
- **Voting System**: 
  - Vote dares up/down for popularity ranking
  - Vote reward amounts up/down ($5 increments per vote)
- **Three Dare Boards**:
  - **Suggested Dares**: User-submitted dares awaiting approval
  - **Active Dares**: Admin-approved dares ready for completion
  - **Completed Dares**: Successfully completed challenges

### 🛠 Admin Controls
- **Admin Authentication**: Password-protected admin panel (default: `admin123`)
- **Dare Management**: Move dares between suggested/active/completed states
- **Completion Tracking**: Mark dares as completed and record who completed them
- **Moderation**: Delete inappropriate or duplicate dares

### 💾 Data Persistence
- All dares and votes are saved to localStorage
- Data persists between browser sessions
- Sample dares included for demonstration

## Getting Started

1. **Open the website**: Simply open `index.html` in any modern web browser
2. **Submit a dare**: Click "SUBMIT DARE" to add a new challenge
3. **Vote on dares**: Use the up/down arrows to vote on popularity and rewards
4. **Admin access**: Click "ADMIN" and enter password `admin123` to manage dares

## How It Works

### For Users
1. **Submit Dares**: Fill out the dare form with title, description, and initial reward
2. **Vote**: Use voting buttons to influence dare popularity and reward amounts
3. **View Progress**: See dares move from suggested → active → completed

### For Admins
1. **Login**: Use the admin button with password `admin123`
2. **Activate Dares**: Move popular dares from suggested to active board
3. **Mark Complete**: Record when someone completes a dare
4. **Moderate**: Delete inappropriate content or deactivate dares

## Voting System

- **Popularity Votes**: Higher votes = higher position on the board
- **Reward Votes**: Each up vote = +$5, each down vote = -$5
- **Minimum Reward**: $5 (cannot go below this amount)
- **Real-time Updates**: All changes are immediately visible to all users

## Technical Details

### Built With
- **HTML5**: Semantic structure and accessibility
- **CSS3**: Modern styling with dark theme and red accents
- **Vanilla JavaScript**: No frameworks - pure JS for maximum compatibility
- **localStorage**: Client-side data persistence

### Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design works on desktop, tablet, and mobile
- No external dependencies required

## File Structure
```
Do Or Dare/
├── index.html          # Main HTML structure
├── styles.css          # All styling and responsive design
├── script.js           # JavaScript functionality
└── README.md          # This documentation
```

## Customization

### Changing Admin Password
In `script.js`, modify the `adminPassword` property:
```javascript
adminPassword: 'your-secure-password'
```

### Styling Modifications
- Colors can be changed in `styles.css`
- Current theme uses black backgrounds with red accents (#ff0000)
- Fonts use Inter from Google Fonts

### Adding Features
The modular code structure makes it easy to add:
- User accounts and authentication
- Database integration
- Payment processing for rewards
- Social media integration
- Mobile app version

## Live Demo Features

The website includes sample dares to demonstrate functionality:
- Pre-loaded suggested and active dares
- Various reward amounts and vote counts
- Different dare types and difficulties

## Security Notes

⚠️ **For Production Use**:
- Implement proper admin authentication
- Add server-side validation
- Use a real database instead of localStorage
- Add rate limiting for voting
- Implement user accounts and session management

## Support

This is a demonstration/prototype version. For production deployment, consider:
- Backend server integration
- Database storage
- User authentication system
- Payment processing integration
- Content moderation tools

---

**Admin Password**: `admin123`
**Sample Data**: Included automatically on first run