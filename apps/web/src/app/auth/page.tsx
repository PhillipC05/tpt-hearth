import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components";

export const metadata: Metadata = {
  title: "Auth"
};

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl lodge-surface page-enter p-8">Preparing the hearth…</div>}>
      <AuthForm />
    </Suspense>
  );
}