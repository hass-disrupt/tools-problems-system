import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth callback endpoint for Slack app installation
 * Handles the OAuth flow when users install the app to their workspace
 * 
 * Slack redirects here with:
 * - code: Authorization code to exchange for access token
 * - state: CSRF protection token (optional but recommended)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors from Slack
    if (error) {
      console.error('[OAUTH] Slack OAuth error:', error);
      return NextResponse.redirect(
        new URL(
          `/oauth-error?error=${encodeURIComponent(error)}`,
          request.url
        )
      );
    }

    // Validate authorization code
    if (!code) {
      console.error('[OAUTH] Missing authorization code');
      return NextResponse.redirect(
        new URL('/oauth-error?error=missing_code', request.url)
      );
    }

    // Get OAuth credentials from environment
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('[OAUTH] Missing SLACK_CLIENT_ID or SLACK_CLIENT_SECRET');
      return NextResponse.redirect(
        new URL('/oauth-error?error=server_config', request.url)
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      console.error('[OAUTH] Token exchange failed:', tokenData.error);
      return NextResponse.redirect(
        new URL(
          `/oauth-error?error=${encodeURIComponent(tokenData.error || 'token_exchange_failed')}`,
          request.url
        )
      );
    }

    // Log successful installation
    console.log('[OAUTH] App installed successfully:', {
      team_id: tokenData.team?.id,
      team_name: tokenData.team?.name,
      authed_user: tokenData.authed_user?.id,
      scope: tokenData.scope,
      token_type: tokenData.token_type,
    });

    // Extract installation details
    const workspaceId = tokenData.team?.id;
    const workspaceName = tokenData.team?.name;
    const botToken = tokenData.access_token;
    const botUserId = tokenData.bot_user_id;
    const authedUserId = tokenData.authed_user?.id;

    // TODO: Store workspace tokens if needed for future API calls
    // For now, we'll just log the installation success
    // You can add database storage here if you need to track installations

    // Redirect to success page
    // You can customize this URL or create a success page
    return NextResponse.redirect(
      new URL(
        `/oauth-success?team=${encodeURIComponent(workspaceName || '')}&team_id=${encodeURIComponent(workspaceId || '')}`,
        request.url
      )
    );
  } catch (error) {
    console.error('[OAUTH] Unexpected error:', error);
    return NextResponse.redirect(
      new URL(
        `/oauth-error?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`,
        request.url
      )
    );
  }
}

