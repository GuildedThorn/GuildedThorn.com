import { Card } from "@components/ui/Card";
import BasicInfoForm from "@components/UserSettings/BasicInfoForm.tsx";
import PasswordChangeForm from "@components/UserSettings/PasswordChangeForm.tsx";

export default function UserSettings() {
    return (
        <div className="max-w-3xl mx-auto p-6">
            <Card title={"User Settings"}>
                <h1 className="font-[Caveat,_cursive] text-2xl mb-2">User Settings</h1>
                <div className="space-y-8">
                    {/* Basic Info Form */}
                    <BasicInfoForm />
                    
                    {/* Password Change Form */}
                    <PasswordChangeForm />
                    
                    {/*/!* Notification Settings *!/*/}
                    {/*<NotificationSettings />*/}
                    
                    {/*/!* Account Deletion *!/*/}
                    {/*<AccountDeletion />*/}
                </div>
            </Card>
        </div>
    );
}