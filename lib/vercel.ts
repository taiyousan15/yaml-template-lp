export async function triggerVercelDeploy(target: 'preview' | 'production'): Promise<{ deploymentId: string; url: string }> {
  const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL!;

  const response = await fetch(deployHookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target,
    }),
  });

  if (!response.ok) {
    throw new Error(`Vercel deploy failed: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    deploymentId: data.id || 'deployment_' + Date.now(),
    url: target === 'production'
      ? `https://${process.env.NEXT_PUBLIC_APP_URL}`
      : `https://preview-${data.id}.vercel.app`,
  };
}

export async function getDeploymentStatus(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deploymentId: string
): Promise<'READY' | 'BUILDING' | 'ERROR'> {
  // TODO: Vercel APIで実際のステータスを取得
  // 現在はモック実装
  return 'READY';
}
