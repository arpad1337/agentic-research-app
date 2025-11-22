import { ActionFunctionArgs } from "@remix-run/node";
import { redirect, Form } from "@remix-run/react"; // Import Form from remix
import apiConnector from "@/connectors/api";
import React from "react";
import { CenteredForm } from "@/components/CenteredForm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PersonalitySelector } from "~/components/PersonalitySelector";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  
  const username = formData.get("username") as string;
  const personality = formData.get("personality") as string;

  const user = await apiConnector.createOrFetchUser(username, personality);

  return redirect(`/upload/${user.id}`);
}

export default function Profile() {
  return (
    <CenteredForm title="User Profile">
      <div className="w-full max-w-lg mx-auto">
        {/* Card Container */}
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <div className="flex flex-col space-y-2 text-center mb-6">
            <h3 className="text-2xl font-semibold tracking-tight">
              Setup Your Profile
            </h3>
            <p className="text-sm text-muted-foreground">
              Enter your details below to create your account.
            </p>
          </div>

          <Form method="post" className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="new_username"
                required
              />
            </div>

            {/* Personality Field */}
            <div className="space-y-2">
              <PersonalitySelector />
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full">
              Update Profile
            </Button>
          </Form>
        </div>
      </div>
    </CenteredForm>
  );
}
