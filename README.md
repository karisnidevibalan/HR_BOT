# HR Agent Bot

## Overview
The HR Agent Bot is an AI-powered application designed to assist employees with their queries related to leave applications and work from home requests. It integrates with Salesforce for record management and utilizes an open-source AI model to process employee inquiries.

## Features
- Handle employee queries regarding HR policies and procedures.
- Manage leave applications and confirmations.
- Process work from home requests and confirmations.
- Integration with Salesforce for creating and managing records.
- Utilizes an open-source AI model for natural language processing.

## Project Structure
```
hr-agent-bot
├── src
│   ├── app.ts
│   ├── controllers
│   │   ├── chatController.ts
│   │   ├── leaveController.ts
│   │   └── wfhController.ts
│   ├── services
│   │   ├── aiService.ts
│   │   ├── salesforceService.ts
│   │   └── hrService.ts
│   ├── models
│   │   ├── Employee.ts
│   │   ├── LeaveRequest.ts
│   │   └── WfhRequest.ts
│   ├── routes
│   │   ├── chat.ts
│   │   ├── leave.ts
│   │   └── wfh.ts
│   ├── middleware
│   │   ├── auth.ts
│   │   └── validation.ts
│   ├── utils
│   │   ├── config.ts
│   │   └── logger.ts
│   └── types
│       └── index.ts
├── tests
│   ├── controllers
│   │   └── chatController.test.ts
│   ├── services
│   │   └── aiService.test.ts
│   └── setup.ts
├── package.json
├── tsconfig.json
├── .env.example
├── jest.config.js
└── README.md
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd hr-agent-bot
   ```
3. Install the dependencies:
   ```
   npm install
   ```
4. Set up environment variables by copying `.env.example` to `.env` and filling in the required values.

## Usage
To start the application, run:
```
npm start
```

## Testing
To run the tests, use:
```
npm test
```

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.# HR_BOT
