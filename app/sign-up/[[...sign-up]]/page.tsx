import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <SignUp
        appearance={{
          elements: {
            formButtonPrimary:
              'bg-blue-600 hover:bg-blue-700 text-sm normal-case',
          },
        }}
      />
    </div>
  );
}
