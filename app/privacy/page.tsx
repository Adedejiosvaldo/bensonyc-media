import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: { absolute: 'Privacy Policy · Benson YC Media' },
  description: 'What the Benson YC Media app collects, why, who processes it and how to have it removed.',
};

const UPDATED = '14 November 2026';

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={UPDATED}>
      <p>
        Benson YC Media (media.mfmbensonyc.org) is the website and team workspace of the media unit of MFM Benson Youth Church, Ikorodu,
        Lagos. This policy explains what the site collects, why, and how you can have it changed or removed. We handle personal data in line
        with the Nigeria Data Protection Act 2023.
      </p>

      <h2>Visitors to the public pages</h2>
      <p>
        You can read the public pages without an account. We don’t run advertising or third-party analytics trackers on them. Our hosting
        provider keeps standard server logs (such as IP address and browser type) for security and to keep the site running.
      </p>

      <h2>Members of the media unit</h2>
      <p>When you join the unit through the site, we keep:</p>
      <ul>
        <li>Your name, email address, WhatsApp number, department, role and membership status.</li>
        <li>Your progress through the onboarding lessons and your signed pledge.</li>
        <li>Duty rosters, swap requests, the dates you block out and any reason you give (your teammates can see these).</li>
        <li>The content you are assigned on the weekly board and a private link for your duty calendar.</li>
        <li>A sign-in cookie so you stay signed in. We use no other cookies.</li>
      </ul>
      <p>We use this only to run the unit: rosters, reminders, onboarding and planning content. We don’t sell it or share it for marketing.</p>

      <h2>The unit’s Instagram and TikTok accounts</h2>
      <p>
        Admins can connect the church’s own Instagram and TikTok accounts so the team can post and see how posts perform. When they do, we
        store:
      </p>
      <ul>
        <li>Access tokens for those accounts, kept in a table only our server can read.</li>
        <li>The accounts’ public profile details and statistics (followers, posts) and each post’s caption, link and numbers (views, reach, likes, comments, shares, saves).</li>
        <li>Photos and videos uploaded for posting. They are deleted from our storage once the post is live, or after 7 days if posting fails.</li>
      </ul>
      <p>
        We read data only from accounts the church owns and has connected. Admins can disconnect an account at any time from the Post page,
        which stops all access. Access can also be removed in Instagram’s or TikTok’s own settings.
      </p>
      <p>
        For AI post suggestions, we also look at recent public posts from other public church and Christian accounts and at public web pages
        about content trends. We store only their links and public counts, to suggest ideas to our team.
      </p>

      <h2>Services that process data for us</h2>
      <ul>
        <li><b>Supabase</b>: database and sign-in.</li>
        <li><b>Vercel</b>: website hosting.</li>
        <li><b>Cloudflare R2</b>: temporary storage of photos and videos before posting.</li>
        <li><b>Resend</b>: reminder emails to members.</li>
        <li><b>Anthropic</b>: generates weekly post suggestions from the unit’s post statistics, captions and content plan. No member contact details are sent.</li>
        <li><b>Meta (Instagram) and TikTok</b>: receive the posts we publish and return statistics for our own accounts.</li>
      </ul>
      <p>Some of these providers store data outside Nigeria. They process it only to provide their service to us.</p>

      <h2>How long we keep it</h2>
      <p>
        Member records stay while you are in the unit. When you leave, an admin marks you inactive; ask us and we will delete your record.
        Post statistics are kept to show growth over time. Uploaded media is deleted as described above.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to see the personal data we hold about you, correct it, or have it deleted, and you can object to how we use it. Most
        details you can update yourself on the Account page.
      </p>

      <h2>Contact</h2>
      <p>
        For any privacy question or request, speak to the media unit head or send a direct message to{' '}
        <a href="https://www.instagram.com/mfmbensonyc/" target="_blank" rel="noreferrer">@mfmbensonyc on Instagram</a>. We aim to reply
        within 14 days.
      </p>

      <h2>Changes</h2>
      <p>If we change this policy, we will update the date at the top of this page.</p>
    </LegalPage>
  );
}
