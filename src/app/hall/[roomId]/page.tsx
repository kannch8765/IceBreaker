import LobbyClient from '@/components/hall/LobbyClient';

// This is a Server Component to allow generateStaticParams without "use client" conflict
export function generateStaticParams() {
  // Required for 'next export' with dynamic routes.
  // We provide a placeholder to ensure the build succeeds.
  return [{ roomId: 'placeholder' }];
}

export default async function DynamicRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  
  // We still use our Client Component for the actual interactive logic
  return <LobbyClient roomId={roomId} />;
}
