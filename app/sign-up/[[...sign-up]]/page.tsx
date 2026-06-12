import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <SignUp
        appearance={{
          elements: {
            formButtonPrimary:
              'bg-brand hover:bg-brand-hover text-sm normal-case',
          },
        }}
      />
    </div>
  );
}
