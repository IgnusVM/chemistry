import { requireCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { PinForm } from "./pin-form";
import { ProfileForm } from "./profile-form";
import { ContactForm } from "./contact-form";
import { AvatarForm } from "./avatar-form";
import { BadgeForm } from "./badge-form";
import { RevokeDeviceButton } from "./revoke-device-button";
import { clearPin } from "./actions";
import { getAttachmentUrl } from "@/lib/s3";

export default async function AccountPage() {
  const user = await requireCurrentUser();
  const devices = await prisma.trustedDevice.findMany({
    where: { userId: user.id },
    orderBy: { lastUsedAt: "desc" },
  });
  const avatarUrl = user.avatarS3Key ? await getAttachmentUrl(user.avatarS3Key) : null;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Account</h1>
        <p className="text-sm text-neutral-500">{user.email}</p>
      </div>

      <ProfileForm displayName={user.displayName} name={user.name} />

      <AvatarForm avatarUrl={avatarUrl} />

      <BadgeForm badgeIcon={user.badgeIcon} badgeColor={user.badgeColor} isOrgAdmin={user.isOrgAdmin} />

      <ContactForm
        phone={user.phone}
        notifyByEmail={user.notifyByEmail}
        contactDuringBurnCell={user.contactDuringBurnCell}
        contactDuringBurnEmail={user.contactDuringBurnEmail}
        contactDuringBurnOther={user.contactDuringBurnOther}
      />

      <PinForm hasPin={!!user.pinHash} />

      {user.pinHash && (
        <form action={clearPin}>
          <button type="submit" className="text-xs text-neutral-400 transition-colors duration-150 hover:text-red-600">
            Remove PIN sign-in entirely
          </button>
        </form>
      )}

      <div className="rounded-md border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Trusted devices</h2>
        <p className="text-xs text-neutral-500">
          Devices that completed an email sign-in and can use your PIN.
        </p>
        <ul className="mt-3 divide-y divide-neutral-200">
          {devices.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <div className="text-neutral-900">{d.label ?? "Unknown device"}</div>
                <div className="text-xs text-neutral-400">
                  Last used {d.lastUsedAt.toLocaleString()}
                </div>
              </div>
              <RevokeDeviceButton deviceId={d.id} />
            </li>
          ))}
          {devices.length === 0 && (
            <li className="py-2 text-sm text-neutral-500">No trusted devices yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
