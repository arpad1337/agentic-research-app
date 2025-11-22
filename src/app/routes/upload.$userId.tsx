import { Link, useLoaderData } from "@remix-run/react";
import React, { useState } from "react";
import apiConnector from "@/connectors/api";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { CenteredForm } from "@/components/CenteredForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { resolvePersonality } from "@/utils";

export async function loader({ params }: LoaderFunctionArgs) {
  const userId = params.userId;
  const user = await apiConnector.getUserById(userId);
  return { user, userId };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = params.userId;

  const formData = await request.formData();
  const file = formData.get("file") as File;

  await apiConnector.uploadFileForUser(userId, file);

  return redirect(`/chat/${userId}`);
}

export default function Upload() {
  const { user, userId } = useLoaderData<typeof loader>();

  return (
    <CenteredForm title="Upload Data">
      <div className="w-full max-w-lg mx-auto">
        {/* Card Container */}
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <div className="flex flex-col space-y-2 text-center mb-6">
            <h3 className="text-2xl font-semibold tracking-tight text-primary">
              Upload Data for ({user.username} as{" "}
              {resolvePersonality(user.personality)})
            </h3>
            <p className="text-sm text-muted-foreground">
              Upload your files below to start analysis.
            </p>
          </div>

          <form
            className="space-y-6"
            method="post"
            encType="multipart/form-data"
          >
            {/* File Upload Field */}
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer mb-8">
              <Input
                type="file"
                id="file-upload"
                name="file"
                className="hidden"
              />
              <Label
                htmlFor="file-upload"
                className="text-muted-foreground block cursor-pointer"
              >
                <span className="text-5xl block mb-2">📄</span>
                <p className="font-medium text-foreground">
                  Drag and drop files here, or{" "}
                  <span className="text-primary font-bold">
                    click to browse
                  </span>
                </p>
                <p className="text-sm mt-2">
                  Supported formats: PDF, TXT, CSV, JSON (max 50MB)
                </p>
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
            >
              Start Analysis
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Uploaded files will be securely processed by the Agentic Research
            Model.
          </p>
        </div>

        {/* Optional Navigation Link */}
        <div className="mt-6 text-center">
          <Link
            to={`/chat/${userId}`}
            className="text-primary hover:text-primary/80 font-medium underline transition-colors"
          >
            Skip and resume chat 💬
          </Link>
        </div>
      </div>
    </CenteredForm>
  );
}
