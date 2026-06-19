import { Card } from "@components/ui/Card";
import AvatarForm from "@components/UserSettings/AvatarForm.tsx";
import BasicInfoForm from "@components/UserSettings/BasicInfoForm.tsx";
import PasswordChangeForm from "@components/UserSettings/PasswordChangeForm.tsx";
import SecurityKeysForm from "@components/UserSettings/SecurityKeysForm.tsx";

export default function UserSettings() {
    return (
        <div className="page">
            <Card>
                <h1 className="text-3xl mb-3">User Settings</h1>
                <div className="space-y-8">
                    {/* Avatar */}
                    <AvatarForm />

                    {/* Basic Info Form */}
                    <BasicInfoForm />

                    {/* Password Change Form */}
                    <PasswordChangeForm />

                    {/* Security keys (WebAuthn / YubiKey) */}
                    <SecurityKeysForm />

                    {/*/!* Notification Settings *!/*/}
                    {/*<NotificationSettings />*/}

                    {/*/!* Account Deletion *!/*/}
                    {/*<AccountDeletion />*/}
                </div>
            </Card>
        </div>
    );
}
