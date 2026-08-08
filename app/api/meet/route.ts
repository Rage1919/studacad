export async function POST() {
  const accessToken = process.env.GOOGLE_MEET_ACCESS_TOKEN;

  if (!accessToken) {
    return Response.json({
      meetingUri: "https://meet.google.com/new",
      provider: "Google Meet",
      demo: true
    });
  }

  const response = await fetch("https://meet.googleapis.com/v2/spaces", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    const detail = await response.text();
    return Response.json({ error: "Google Meet could not create the meeting space.", detail }, { status: 502 });
  }

  const space = await response.json();
  return Response.json({
    meetingUri: space.meetingUri,
    spaceName: space.name,
    provider: "Google Meet",
    demo: false
  });
}
