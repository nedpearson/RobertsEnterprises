const fs = require("fs");
const p = "apps/marketing/src/components/vowos/settings/tabs/IntegrationsSettingsTab.tsx";
let c = fs.readFileSync(p, "utf8");

// Add state for new integrations
c = c.replace(/const \[stripe, setStripe\] = useState\(\{/, `const [social, setSocial] = useState({ shopify: "", facebook: "", instagram: "", shopifyStatus: "disconnected", facebookStatus: "disconnected", instagramStatus: "disconnected" });\n  const [stripe, setStripe] = useState({`);

// Add the new card UI before Stripe card
const newCard = `
      <SettingsCard
        title="E-Commerce & Social Channels"
        description="Connect your digital storefronts and social media accounts for automated sync."
        icon={<Plug className="h-5 w-5" />}
      >
        <div className="space-y-4">
          {/* Shopify */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between p-4 bg-stone-50 border border-stone-200 rounded-xl gap-4">
            <div className="flex-1 w-full space-y-1">
              <label className="text-xs font-semibold text-stone-700">Shopify Store URL</label>
              <input
                type="text"
                placeholder="e.g. my-store.myshopify.com"
                value={social.shopify}
                onChange={(e) => setSocial({ ...social, shopify: e.target.value })}
                className={inputCls}
                disabled={social.shopifyStatus === "connected"}
              />
            </div>
            <Button 
              variant={social.shopifyStatus === "connected" ? "outline" : "default"}
              onClick={() => {
                if (!social.shopify) return;
                setSocial({ ...social, shopifyStatus: social.shopifyStatus === "connected" ? "disconnected" : "connected" });
              }}
              className={social.shopifyStatus !== "connected" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
            >
              {social.shopifyStatus === "connected" ? "Disconnect" : "Automate Connection"}
            </Button>
          </div>

          {/* Facebook */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between p-4 bg-stone-50 border border-stone-200 rounded-xl gap-4">
            <div className="flex-1 w-full space-y-1">
              <label className="text-xs font-semibold text-stone-700">Facebook Page URL</label>
              <input
                type="text"
                placeholder="e.g. facebook.com/my-boutique"
                value={social.facebook}
                onChange={(e) => setSocial({ ...social, facebook: e.target.value })}
                className={inputCls}
                disabled={social.facebookStatus === "connected"}
              />
            </div>
            <Button 
              variant={social.facebookStatus === "connected" ? "outline" : "default"}
              onClick={() => {
                if (!social.facebook) return;
                setSocial({ ...social, facebookStatus: social.facebookStatus === "connected" ? "disconnected" : "connected" });
              }}
              className={social.facebookStatus !== "connected" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
            >
              {social.facebookStatus === "connected" ? "Disconnect" : "Automate Connection"}
            </Button>
          </div>

          {/* Instagram */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between p-4 bg-stone-50 border border-stone-200 rounded-xl gap-4">
            <div className="flex-1 w-full space-y-1">
              <label className="text-xs font-semibold text-stone-700">Instagram URL</label>
              <input
                type="text"
                placeholder="e.g. instagram.com/my-boutique"
                value={social.instagram}
                onChange={(e) => setSocial({ ...social, instagram: e.target.value })}
                className={inputCls}
                disabled={social.instagramStatus === "connected"}
              />
            </div>
            <Button 
              variant={social.instagramStatus === "connected" ? "outline" : "default"}
              onClick={() => {
                if (!social.instagram) return;
                setSocial({ ...social, instagramStatus: social.instagramStatus === "connected" ? "disconnected" : "connected" });
              }}
              className={social.instagramStatus !== "connected" ? "bg-pink-600 hover:bg-pink-700 text-white" : ""}
            >
              {social.instagramStatus === "connected" ? "Disconnect" : "Automate Connection"}
            </Button>
          </div>
        </div>
      </SettingsCard>
`;

c = c.replace(/<SettingsCard\s+title="Stripe Payment Gateways"/, newCard + "\n      <SettingsCard\n        title=\"Stripe Payment Gateways\"");
fs.writeFileSync(p, c, "utf8");

