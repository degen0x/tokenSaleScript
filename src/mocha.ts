import * as anchor from "@coral-xyz/anchor";
import {Program, Wallet, web3} from "@coral-xyz/anchor";
import { TokenSale } from "../target/types/token_sale";

import {clusterApiUrl, Keypair, PublicKey} from "@solana/web3.js";
import {BN} from "bn.js";
import bs58 from "bs58"
import {
    createAssociatedTokenAccount,
    getAccount,
    getAssociatedTokenAddress,
    getOrCreateAssociatedTokenAccount,
    mintTo,
} from "@solana/spl-token";

describe("tokenSale", () => {
    const connection = new web3.Connection(clusterApiUrl("devnet"));
    const adminKeypair = web3.Keypair.fromSecretKey(Uint8Array.from([44,80,171,173,241,101,64,139,192,26,111,88,60,120,80,114,200,96,47,191,160,50,198,195,122,228,56,19,171,55,90,146,5,197,173,76,91,118,205,122,8,208,252,198,84,160,163,53,125,204,227,30,240,83,34,80,16,56,9,126,211,173,107,230]));
    // enter your secret key
    const userKeypair = web3.Keypair.fromSecretKey(bs58.decode("<enter your private key>"));

    const wallet = new Wallet(userKeypair);

    const provider = new anchor.AnchorProvider(connection, wallet)
    anchor.setProvider(provider);

    const program = anchor.workspace.TokenSale as Program<TokenSale>;

    const mint = new web3.PublicKey("5UdCc3A1b65nyjftajQ8kMUCQRH2kqChL7oBGwdY1hde");
    const config = new web3.PublicKey("6nsRQQqZ4WHkmnPYv9vDDQuEzx6zfN93Q8kM9hSoQhUf")
    const myUsdtMint = new web3.PublicKey("8YQ4Q8XAT6GBGRdQrPWASpjeJagppzhHzjj4wTsvHNK");
    const myUsdcMint =  new web3.PublicKey("GUxS4tgDFF1hTtLPgJAsUa6vvEwcBYBJGcokPsPVZMqb");

    it("Init sale", async () => {
        // (_1st stage price_, _2nd stage price_, _stages border_, _2nd stage duration in sec_, _limit per wallet_)
        const tx = await program.methods.initSale(new BN(200), new BN(1000), new BN(88888000000), new BN(1209600), new BN(2222000000))
            .accounts({
                mint: mint,
                usdtMint: myUsdtMint,
                usdcMint: myUsdcMint,
            })
            // .simulate()
        .rpc();
        console.log("Your transaction signature", tx);
    });

    it.only("Buy", async () => {

        const userUsdtAta = await getAssociatedTokenAddress(myUsdtMint, userKeypair.publicKey);
        const userUsdcAta = await getAssociatedTokenAddress(myUsdcMint, userKeypair.publicKey);

        try {
            await getAccount(connection, userUsdtAta);
        } catch (e) {
            if (e.name === "TokenAccountNotFoundError") {
                await createAssociatedTokenAccount(connection, userKeypair, myUsdtMint, userKeypair.publicKey, {commitment: "finalized"})
            } else {
                throw e;
            }
        }

        try {
            await getAccount(connection, userUsdcAta);
        } catch (e) {
            if (e.name === "TokenAccountNotFoundError") {
                await createAssociatedTokenAccount(connection, userKeypair, myUsdcMint, userKeypair.publicKey, {commitment: "finalized"})
            } else {
                throw e;
            }
        }

        await mintTo(connection, userKeypair, myUsdtMint, userUsdtAta, adminKeypair, 100000000000);
        await mintTo(connection, userKeypair, myUsdcMint, userUsdcAta, adminKeypair, 100000000000);

        const configUsdtAta = await getAssociatedTokenAddress(myUsdtMint, config, true);
        const configUsdcAta = await getAssociatedTokenAddress(myUsdcMint, config, true);
        const configAta = await getAssociatedTokenAddress(mint, config, true);
        const userAta = await getAssociatedTokenAddress(mint, userKeypair.publicKey);
        const userState = web3.PublicKey.findProgramAddressSync([Buffer.from("user"), userKeypair.publicKey.toBuffer()], new web3.PublicKey("8485PZTPiULpLaFxxRtuQHEK76m7oqeYLM3Bm5h4S6y7"))[0];

        // (_amount in tokens_)
        const tx = await program.methods.buy(new BN(100000000))
            .accounts({
                payer: userKeypair.publicKey,
                mint: mint,
                userStableAta: userUsdcAta,
                vaultStableAta: configUsdcAta,
            })
            // .simulate();
        .rpc();

        console.log("Your transaction signature", tx);
    });
});