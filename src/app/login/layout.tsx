import { GuestGuard } from "@/auth";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GuestGuard>{children}</GuestGuard>;
}
