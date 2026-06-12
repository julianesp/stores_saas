import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <SignIn
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
