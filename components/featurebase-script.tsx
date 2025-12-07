'use client'

import Script from 'next/script'

export function FeatureBaseScript() {
    return (
        <Script
            id="featurebase-sdk"
            src="https://do.featurebase.app/js/sdk.js"
            strategy="afterInteractive"
            onLoad={() => {
                // @ts-ignore
                if (typeof window !== 'undefined' && window.Featurebase) {
                    // @ts-ignore
                    window.Featurebase.initialize_feedback_widget({
                        organization: "pogepg",
                        theme: "light",
                        email: ""
                    });
                }
            }}
        />
    )
}
